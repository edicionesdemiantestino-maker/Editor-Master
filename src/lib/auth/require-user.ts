import { redirect } from "next/navigation";

import { getUserSafe } from "./get-user";

export async function requireUser() {
  const user = await getUserSafe();

  if (!user) {
    redirect("/login");
  }

  return user;
}
