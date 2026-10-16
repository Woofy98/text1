"""Backend API tests for To-Do app (lists, tasks, counts, restore)."""
import os
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://todo-tracker-590.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def inbox(s):
    r = s.get(f"{API}/lists")
    assert r.status_code == 200
    lists = r.json()
    inbox = next((l for l in lists if l["is_default"]), None)
    assert inbox is not None, "Inbox must exist"
    return inbox


# ---------------- Health / OpenAPI ----------------
def test_openapi_accessible(s):
    r = s.get(f"{API}/openapi.json")
    assert r.status_code == 200
    assert "paths" in r.json()


def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200


# ---------------- Lists ----------------
class TestLists:
    def test_get_lists_includes_inbox(self, s):
        r = s.get(f"{API}/lists")
        assert r.status_code == 200
        lists = r.json()
        assert any(l["is_default"] and l["name"] == "Inbox" for l in lists)

    def test_create_rename_delete_list(self, s):
        r = s.post(f"{API}/lists", json={"name": "TEST_List1"})
        assert r.status_code == 201
        lst = r.json()
        assert lst["name"] == "TEST_List1"
        assert lst["is_default"] is False
        lid = lst["id"]

        r = s.patch(f"{API}/lists/{lid}", json={"name": "TEST_List1_Renamed"})
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_List1_Renamed"

        # verify persisted
        r = s.get(f"{API}/lists")
        assert any(l["id"] == lid and l["name"] == "TEST_List1_Renamed" for l in r.json())

        r = s.delete(f"{API}/lists/{lid}")
        assert r.status_code == 200
        assert r.json().get("deleted") is True

    def test_rename_inbox_rejected(self, s, inbox):
        r = s.patch(f"{API}/lists/{inbox['id']}", json={"name": "NotInbox"})
        assert r.status_code == 400

    def test_delete_inbox_rejected(self, s, inbox):
        r = s.delete(f"{API}/lists/{inbox['id']}")
        assert r.status_code == 400

    def test_delete_list_moves_tasks_to_inbox(self, s, inbox):
        # create list + task
        lst = s.post(f"{API}/lists", json={"name": "TEST_ToDelete"}).json()
        task = s.post(f"{API}/tasks", json={"title": "TEST_moveMe", "list_id": lst["id"]}).json()
        assert task["list_id"] == lst["id"]

        r = s.delete(f"{API}/lists/{lst['id']}")
        assert r.status_code == 200
        assert r.json()["moved_tasks"] >= 1

        # task should now be in inbox
        got = s.get(f"{API}/tasks/{task['id']}").json()
        assert got["list_id"] == inbox["id"]

        # cleanup
        s.delete(f"{API}/tasks/{task['id']}")

    def test_empty_name_422(self, s):
        r = s.post(f"{API}/lists", json={"name": "   "})
        assert r.status_code == 422


# ---------------- Tasks CRUD + validation ----------------
class TestTasks:
    def test_create_minimal_and_get(self, s, inbox):
        r = s.post(f"{API}/tasks", json={"title": "TEST_basic"})
        assert r.status_code == 201
        t = r.json()
        assert t["title"] == "TEST_basic"
        assert t["list_id"] == inbox["id"]
        assert t["priority"] == "medium"
        assert t["completed"] is False

        r = s.get(f"{API}/tasks/{t['id']}")
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_basic"
        s.delete(f"{API}/tasks/{t['id']}")

    def test_create_empty_title_422(self, s):
        assert s.post(f"{API}/tasks", json={"title": ""}).status_code == 422
        assert s.post(f"{API}/tasks", json={"title": "   "}).status_code == 422

    def test_create_title_too_long_422(self, s):
        assert s.post(f"{API}/tasks", json={"title": "x" * 201}).status_code == 422

    def test_create_notes_too_long_422(self, s):
        assert s.post(f"{API}/tasks", json={"title": "ok", "notes": "y" * 2001}).status_code == 422

    def test_create_invalid_list_id_400(self, s):
        r = s.post(f"{API}/tasks", json={"title": "ok", "list_id": "non-existent-id"})
        assert r.status_code == 400

    def test_update_task(self, s):
        t = s.post(f"{API}/tasks", json={"title": "TEST_upd"}).json()
        r = s.patch(f"{API}/tasks/{t['id']}", json={"title": "TEST_upd2", "priority": "high", "completed": True})
        assert r.status_code == 200
        upd = r.json()
        assert upd["title"] == "TEST_upd2"
        assert upd["priority"] == "high"
        assert upd["completed"] is True
        assert upd["completed_at"] is not None

        # Verify persistence
        got = s.get(f"{API}/tasks/{t['id']}").json()
        assert got["title"] == "TEST_upd2"
        assert got["completed"] is True
        s.delete(f"{API}/tasks/{t['id']}")

    def test_update_empty_title_422(self, s):
        t = s.post(f"{API}/tasks", json={"title": "TEST_upd"}).json()
        r = s.patch(f"{API}/tasks/{t['id']}", json={"title": "   "})
        assert r.status_code == 422
        s.delete(f"{API}/tasks/{t['id']}")

    def test_delete_task_404(self, s):
        t = s.post(f"{API}/tasks", json={"title": "TEST_del"}).json()
        assert s.delete(f"{API}/tasks/{t['id']}").status_code == 200
        assert s.get(f"{API}/tasks/{t['id']}").status_code == 404


# ---------------- Filters / Sort ----------------
class TestFiltersAndSort:
    @pytest.fixture(scope="class")
    def seeded(self, s, inbox):
        today = date.today()
        # Create a dedicated list
        lst = s.post(f"{API}/lists", json={"name": "TEST_FilterList"}).json()
        tasks = []
        tasks.append(s.post(f"{API}/tasks", json={
            "title": "TEST_filt_today_apple", "list_id": lst["id"], "priority": "low",
            "due_date": today.isoformat()
        }).json())
        tasks.append(s.post(f"{API}/tasks", json={
            "title": "TEST_filt_overdue_banana", "list_id": lst["id"], "priority": "high",
            "due_date": (today - timedelta(days=2)).isoformat()
        }).json())
        tasks.append(s.post(f"{API}/tasks", json={
            "title": "TEST_filt_future", "notes": "APPLE_PIE", "list_id": lst["id"], "priority": "medium",
            "due_date": (today + timedelta(days=5)).isoformat()
        }).json())
        tasks.append(s.post(f"{API}/tasks", json={
            "title": "TEST_filt_nodue", "list_id": lst["id"], "priority": "medium"
        }).json())
        yield {"list": lst, "tasks": tasks, "today": today.isoformat()}
        # cleanup
        for t in tasks:
            s.delete(f"{API}/tasks/{t['id']}")
        s.delete(f"{API}/lists/{lst['id']}")

    def test_filter_by_list(self, s, seeded):
        r = s.get(f"{API}/tasks", params={"list_id": seeded["list"]["id"]})
        assert r.status_code == 200
        titles = [t["title"] for t in r.json()]
        assert len(titles) == 4

    def test_view_today(self, s, seeded):
        r = s.get(f"{API}/tasks", params={"view": "today", "today": seeded["today"], "list_id": seeded["list"]["id"]})
        assert r.status_code == 200
        titles = [t["title"] for t in r.json()]
        assert "TEST_filt_today_apple" in titles
        assert "TEST_filt_overdue_banana" not in titles

    def test_view_overdue(self, s, seeded):
        r = s.get(f"{API}/tasks", params={"view": "overdue", "today": seeded["today"], "list_id": seeded["list"]["id"]})
        titles = [t["title"] for t in r.json()]
        assert "TEST_filt_overdue_banana" in titles
        assert "TEST_filt_today_apple" not in titles

    def test_search_case_insensitive_title_and_notes(self, s, seeded):
        r = s.get(f"{API}/tasks", params={"search": "apple", "list_id": seeded["list"]["id"]})
        titles = [t["title"] for t in r.json()]
        # Match title "today_apple" + notes "APPLE_PIE"
        assert "TEST_filt_today_apple" in titles
        assert "TEST_filt_future" in titles

    def test_sort_due_nulls_last(self, s, seeded):
        r = s.get(f"{API}/tasks", params={"sort": "due", "list_id": seeded["list"]["id"]})
        tasks = r.json()
        due = [t["due_date"] for t in tasks]
        # Last one should be null
        assert due[-1] is None

    def test_sort_priority_high_first(self, s, seeded):
        r = s.get(f"{API}/tasks", params={"sort": "priority", "list_id": seeded["list"]["id"]})
        prios = [t["priority"] for t in r.json()]
        assert prios[0] == "high"

    def test_status_done_overdue_empty(self, s, seeded):
        # overdue + done should be empty
        r = s.get(f"{API}/tasks", params={"view": "overdue", "status": "done", "today": seeded["today"]})
        assert r.json() == []


# ---------------- Counts ----------------
class TestCounts:
    def test_counts_structure(self, s):
        today = date.today().isoformat()
        r = s.get(f"{API}/counts", params={"today": today})
        assert r.status_code == 200
        data = r.json()
        for key in ("all", "today", "overdue", "lists", "scope"):
            assert key in data
        assert "total" in data["scope"] and "done" in data["scope"]


# ---------------- Clear completed ----------------
class TestClearCompleted:
    def test_clear_completed_scoped(self, s):
        lst = s.post(f"{API}/lists", json={"name": "TEST_Clear"}).json()
        t1 = s.post(f"{API}/tasks", json={"title": "TEST_c1", "list_id": lst["id"]}).json()
        t2 = s.post(f"{API}/tasks", json={"title": "TEST_c2", "list_id": lst["id"]}).json()
        s.patch(f"{API}/tasks/{t1['id']}", json={"completed": True})
        s.patch(f"{API}/tasks/{t2['id']}", json={"completed": True})

        r = s.delete(f"{API}/tasks/completed", params={"list_id": lst["id"]})
        assert r.status_code == 200
        assert r.json()["deleted"] >= 2

        assert s.get(f"{API}/tasks/{t1['id']}").status_code == 404
        s.delete(f"{API}/lists/{lst['id']}")


# ---------------- Restore ----------------
class TestRestore:
    def test_restore_task_same_id(self, s):
        t = s.post(f"{API}/tasks", json={"title": "TEST_restoreMe", "priority": "high"}).json()
        tid = t["id"]
        assert s.delete(f"{API}/tasks/{tid}").status_code == 200
        assert s.get(f"{API}/tasks/{tid}").status_code == 404

        # Restore with same payload
        r = s.post(f"{API}/tasks/restore", json=t)
        assert r.status_code == 201
        restored = r.json()
        assert restored["id"] == tid
        assert restored["title"] == "TEST_restoreMe"

        # Verify
        got = s.get(f"{API}/tasks/{tid}").json()
        assert got["id"] == tid
        s.delete(f"{API}/tasks/{tid}")
