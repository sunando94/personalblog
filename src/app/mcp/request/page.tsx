import { redirect } from "next/navigation";

export default function RequestTokenRedirect() {
  redirect("/profile");
}
