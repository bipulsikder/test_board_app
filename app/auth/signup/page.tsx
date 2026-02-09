import { redirectToCanonicalSignUp } from "@/app/auth/redirects"

export default function SignupAliasPage(props: { searchParams?: { returnTo?: string } }) {
  redirectToCanonicalSignUp(props.searchParams)
}
