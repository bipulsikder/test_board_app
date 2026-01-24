import { redirect } from "next/navigation"

export default function SignupAliasPage(props: { searchParams?: { returnTo?: string } }) {
  const returnTo = props.searchParams?.returnTo
  redirect(returnTo ? `/auth/sign_up?returnTo=${encodeURIComponent(returnTo)}` : "/auth/sign_up")
}

