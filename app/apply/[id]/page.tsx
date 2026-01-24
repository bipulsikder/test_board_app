import { redirect } from "next/navigation"

export const revalidate = 0

export default async function ApplyPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  redirect(`/jobs/${id}/apply`)
}
