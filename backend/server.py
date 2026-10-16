from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Literal, Dict
from datetime import datetime, timezone, date, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI(title="To-Do API", openapi_url="/api/openapi.json", docs_url="/api/docs", redoc_url=None)
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

Priority = Literal["low", "medium", "high"]
PRIORITY_RANK = {"high": 0, "medium": 1, "low": 2}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


class BaseDocument(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    id: str = Field(default_factory=new_id)

    def to_mongo(self) -> dict:
        data = self.model_dump()
        data["_id"] = data.pop("id")
        return data

    @classmethod
    def from_mongo(cls, doc: dict):
        doc = dict(doc)
        doc["id"] = str(doc.pop("_id"))
        return cls(**doc)


class TaskList(BaseDocument):
    name: str
    is_default: bool = False
    created_at: str = Field(default_factory=now_iso)


class Task(BaseDocument):
    title: str
    notes: Optional[str] = None
    list_id: str
    priority: Priority = "medium"
    due_date: Optional[str] = None
    completed: bool = False
    completed_at: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


def _clean_title(v: str) -> str:
    v = (v or "").strip()
    if not v:
        raise ValueError("Title cannot be empty")
    if len(v) > 200:
        raise ValueError("Title must be at most 200 characters")
    return v


def _clean_name(v: str) -> str:
    v = (v or "").strip()
    if not v:
        raise ValueError("Name cannot be empty")
    if len(v) > 60:
        raise ValueError("Name must be at most 60 characters")
    return v


class ListIn(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def _name(cls, v):
        return _clean_name(v)


class ListOut(BaseModel):
    id: str
    name: str
    is_default: bool
    created_at: str


class TaskCreate(BaseModel):
    title: str
    notes: Optional[str] = Field(default=None, max_length=2000)
    list_id: Optional[str] = None
    priority: Priority = "medium"
    due_date: Optional[date] = None

    @field_validator("title")
    @classmethod
    def _title(cls, v):
        return _clean_title(v)


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = Field(default=None, max_length=2000)
    list_id: Optional[str] = None
    priority: Optional[Priority] = None
    due_date: Optional[date] = None
    completed: Optional[bool] = None

    @field_validator("title")
    @classmethod
    def _title(cls, v):
        return None if v is None else _clean_title(v)


class TaskRestore(Task):
    @field_validator("title")
    @classmethod
    def _title(cls, v):
        return _clean_title(v)


async def get_inbox() -> TaskList:
    doc = await db.lists.find_one({"is_default": True})
    if doc:
        return TaskList.from_mongo(doc)
    inbox = TaskList(name="Inbox", is_default=True)
    await db.lists.insert_one(inbox.to_mongo())
    return inbox


async def ensure_list(list_id: Optional[str]) -> str:
    if not list_id:
        return (await get_inbox()).id
    if not await db.lists.find_one({"_id": list_id}):
        raise HTTPException(status_code=400, detail="List not found")
    return list_id


def today_str(today: Optional[str]) -> str:
    if today:
        try:
            return date.fromisoformat(today).isoformat()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid 'today' date")
    return datetime.now(timezone.utc).date().isoformat()


def build_query(list_id, view, today, search=None, status="all") -> dict:
    q: dict = {}
    if list_id:
        q["list_id"] = list_id
    if view == "today":
        q["due_date"] = today
    elif view == "overdue":
        q["due_date"] = {"$ne": None, "$lt": today}
        q["completed"] = False
    if status == "active":
        q["completed"] = False
    elif status == "done":
        if view == "overdue":
            q["_id"] = {"$exists": False}
        else:
            q["completed"] = True
    if search and search.strip():
        rx = {"$regex": re.escape(search.strip()), "$options": "i"}
        q["$or"] = [{"title": rx}, {"notes": rx}]
    return q


def sort_tasks(tasks: List[Task], sort: str) -> List[Task]:
    if sort == "priority":
        return sorted(tasks, key=lambda t: (PRIORITY_RANK[t.priority], t.due_date or "9999-99-99", t.created_at))
    if sort == "due":
        return sorted(tasks, key=lambda t: (t.due_date is None, t.due_date or "", PRIORITY_RANK[t.priority]))
    return sorted(tasks, key=lambda t: t.created_at, reverse=True)


# ---------- Lists ----------
@api.get("/")
async def root():
    return {"message": "To-Do API"}


@api.get("/lists", response_model=List[ListOut])
async def get_lists():
    await get_inbox()
    docs = await db.lists.find().to_list(1000)
    lists = [TaskList.from_mongo(d) for d in docs]
    lists.sort(key=lambda l: (not l.is_default, l.created_at))
    return [l.model_dump() for l in lists]


@api.post("/lists", response_model=ListOut, status_code=201)
async def create_list(body: ListIn):
    lst = TaskList(name=body.name)
    await db.lists.insert_one(lst.to_mongo())
    return lst.model_dump()


@api.patch("/lists/{list_id}", response_model=ListOut)
@api.put("/lists/{list_id}", response_model=ListOut)
async def rename_list(list_id: str, body: ListIn):
    doc = await db.lists.find_one({"_id": list_id})
    if not doc:
        raise HTTPException(status_code=404, detail="List not found")
    if doc.get("is_default"):
        raise HTTPException(status_code=400, detail="Inbox cannot be renamed")
    await db.lists.update_one({"_id": list_id}, {"$set": {"name": body.name}})
    doc["name"] = body.name
    return TaskList.from_mongo(doc).model_dump()


@api.delete("/lists/{list_id}")
async def delete_list(list_id: str):
    doc = await db.lists.find_one({"_id": list_id})
    if not doc:
        raise HTTPException(status_code=404, detail="List not found")
    if doc.get("is_default"):
        raise HTTPException(status_code=400, detail="Inbox cannot be deleted")
    inbox = await get_inbox()
    res = await db.tasks.update_many({"list_id": list_id}, {"$set": {"list_id": inbox.id, "updated_at": now_iso()}})
    await db.lists.delete_one({"_id": list_id})
    return {"deleted": True, "moved_tasks": res.modified_count, "inbox_id": inbox.id}


# ---------- Counts ----------
@api.get("/counts")
async def get_counts(
    today: Optional[str] = None,
    list_id: Optional[str] = None,
    view: Optional[Literal["today", "overdue"]] = None,
):
    t = today_str(today)
    active = {"completed": False}
    lists_counts: Dict[str, int] = {}
    async for row in db.tasks.aggregate([{"$match": active}, {"$group": {"_id": "$list_id", "n": {"$sum": 1}}}]):
        lists_counts[row["_id"]] = row["n"]
    scope_q = build_query(list_id, view, t)
    return {
        "all": await db.tasks.count_documents(active),
        "today": await db.tasks.count_documents({"completed": False, "due_date": t}),
        "overdue": await db.tasks.count_documents(build_query(None, "overdue", t)),
        "lists": lists_counts,
        "scope": {
            "total": await db.tasks.count_documents(scope_q),
            "done": await db.tasks.count_documents({**scope_q, "completed": True}),
        },
    }


# ---------- Tasks ----------
@api.get("/tasks", response_model=List[Task])
async def get_tasks(
    list_id: Optional[str] = None,
    status: Literal["all", "active", "done"] = "all",
    search: Optional[str] = None,
    view: Optional[Literal["today", "overdue"]] = None,
    sort: Literal["due", "priority", "newest"] = "newest",
    today: Optional[str] = Query(default=None, description="Client local date YYYY-MM-DD"),
):
    q = build_query(list_id, view, today_str(today), search, status)
    docs = await db.tasks.find(q).to_list(5000)
    return sort_tasks([Task.from_mongo(d) for d in docs], sort)


@api.post("/tasks", response_model=Task, status_code=201)
async def create_task(body: TaskCreate):
    task = Task(
        title=body.title,
        notes=(body.notes or "").strip() or None,
        list_id=await ensure_list(body.list_id),
        priority=body.priority,
        due_date=body.due_date.isoformat() if body.due_date else None,
    )
    await db.tasks.insert_one(task.to_mongo())
    return task


@api.post("/tasks/restore", response_model=Task, status_code=201)
async def restore_task(body: TaskRestore):
    task = Task(**body.model_dump())
    if not await db.lists.find_one({"_id": task.list_id}):
        task.list_id = (await get_inbox()).id
    await db.tasks.replace_one({"_id": task.id}, task.to_mongo(), upsert=True)
    return task


@api.delete("/tasks/completed")
async def clear_completed(list_id: Optional[str] = None):
    q = {"completed": True}
    if list_id:
        q["list_id"] = list_id
    res = await db.tasks.delete_many(q)
    return {"deleted": res.deleted_count}


@api.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    doc = await db.tasks.find_one({"_id": task_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")
    return Task.from_mongo(doc)


@api.patch("/tasks/{task_id}", response_model=Task)
@api.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, body: TaskUpdate):
    doc = await db.tasks.find_one({"_id": task_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")
    changes = body.model_dump(exclude_unset=True)
    upd: dict = {}
    if "title" in changes:
        if changes["title"] is None:
            raise HTTPException(status_code=422, detail="Title cannot be empty")
        upd["title"] = changes["title"]
    if "notes" in changes:
        upd["notes"] = (changes["notes"] or "").strip() or None
    if "list_id" in changes:
        upd["list_id"] = await ensure_list(changes["list_id"])
    if changes.get("priority"):
        upd["priority"] = changes["priority"]
    if "due_date" in changes:
        upd["due_date"] = changes["due_date"].isoformat() if changes["due_date"] else None
    if changes.get("completed") is not None:
        upd["completed"] = changes["completed"]
        upd["completed_at"] = now_iso() if changes["completed"] else None
    upd["updated_at"] = now_iso()
    await db.tasks.update_one({"_id": task_id}, {"$set": upd})
    return Task.from_mongo(await db.tasks.find_one({"_id": task_id}))


@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    res = await db.tasks.delete_one({"_id": task_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"deleted": True}


# ---------- Seed ----------
async def seed():
    if await db.lists.count_documents({}) == 0 and await db.tasks.count_documents({}) == 0:
        inbox = TaskList(name="Inbox", is_default=True)
        work = TaskList(name="Work")
        personal = TaskList(name="Personal")
        await db.lists.insert_many([l.to_mongo() for l in (inbox, work, personal)])
        d = datetime.now(timezone.utc).date()
        iso = lambda n: (d + timedelta(days=n)).isoformat()
        samples = [
            Task(title="Finalize Q3 project proposal", notes="Include budget breakdown and timeline.", list_id=work.id, priority="high", due_date=iso(0)),
            Task(title="Reply to client feedback email", list_id=work.id, priority="medium", due_date=iso(-2)),
            Task(title="Book dentist appointment", list_id=personal.id, priority="low", due_date=iso(3)),
            Task(title="Buy groceries for the week", notes="Oat milk, spinach, eggs, coffee beans.", list_id=personal.id, priority="medium"),
            Task(title="Read chapter 4 of 'Deep Work'", list_id=inbox.id, priority="low", due_date=iso(7)),
            Task(title="Set up new laptop", list_id=inbox.id, priority="high", due_date=iso(-1), completed=True, completed_at=now_iso()),
        ]
        await db.tasks.insert_many([t.to_mongo() for t in samples])
        logger.info("Seeded default lists and tasks")
    await get_inbox()


@app.on_event("startup")
async def on_startup():
    await seed()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ['CORS_ORIGINS'].split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
