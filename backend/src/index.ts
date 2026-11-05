import app from "./app.ts";
console.log(process.env.PORT);
import { env } from "./env.ts";

app.listen(env.PORT, () => {
  console.log(`App running on ${env.PORT}`);
});
