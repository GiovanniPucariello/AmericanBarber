export type AuthActionState = {
  error: string | null;
  success?: string | null;
};

export const authInitialState: AuthActionState = { error: null };
