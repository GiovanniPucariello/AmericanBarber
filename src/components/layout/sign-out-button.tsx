import { signOut } from "@/lib/auth/actions";
import { NavIcon } from "@/components/layout/nav-icon";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        aria-label="Esci"
        title="Esci"
        className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-paper-50/80 hover:text-paper-50 active:scale-[0.94] transition-transform"
      >
        <NavIcon name="logout" />
      </button>
    </form>
  );
}
