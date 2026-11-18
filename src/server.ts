import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3000);

createApp().listen(port, () => {
  console.log(`Aldermoor fund ops running at http://localhost:${port}`);
});
