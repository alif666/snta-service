import path from "node:path";
import * as moduleAlias from "module-alias";

const aliasRoot = process.env.VERCEL
  ? path.resolve(process.cwd(), "src")
  : path.resolve(__dirname, "..");

moduleAlias.addAlias("@", aliasRoot);
