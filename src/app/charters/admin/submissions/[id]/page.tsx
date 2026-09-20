import { AppFrame } from "@/components/boat/AppFrame";import { SubmissionAdminDetail } from "./submission-admin-detail";
export default async function CharterSubmissionAdminDetailPage({params}:{params:Promise<{id:string}>}){return <AppFrame><SubmissionAdminDetail id={(await params).id}/></AppFrame>}
