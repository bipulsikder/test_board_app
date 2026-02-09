import { redirectToCanonicalSignUp } from "@/app/auth/redirects"

export default function SignUpAliasPage(props: { searchParams?: { returnTo?: string } }) {
  redirectToCanonicalSignUp(props.searchParams)
}
