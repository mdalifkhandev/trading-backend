import { syncJournalForConnectedUsers } from "./journal.service";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function startJournalScheduler() {
  setInterval(async () => {
    try {
      const result = await syncJournalForConnectedUsers();
      console.log("Journal sync completed", result);
    } catch (error) {
      console.error("Journal sync failed", error);
    }
  }, TWO_HOURS_MS);
}
