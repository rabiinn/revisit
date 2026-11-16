import app from "./app.ts";
import { env } from "./env.ts";

app.listen(env.PORT, () => {
  console.log(`App running on ${env.PORT}`);
});
