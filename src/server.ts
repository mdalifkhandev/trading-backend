import { env } from "./config/env";
import { app } from "./app";
import { startJournalScheduler } from "./modules/journal/journal.scheduler";
import 'dotenv/config';


app.listen(env.PORT, () => {
  startJournalScheduler();
  console.log(`Server listening on port ${env.PORT}`);
});
