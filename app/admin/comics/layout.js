import { requireEditorAccess } from "../../../utils/auth/require-editor";

export default async function AdminComicsLayout({children}){
  await requireEditorAccess();
  return children;
}
