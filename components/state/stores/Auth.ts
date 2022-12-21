import { State } from "..";
import { AbstractStore } from ".";
import type ClientController from "@revolt/client/Controller";

interface Session {
  token: string;
  user_id: string;
}

interface Account {
  session: Session;
  apiUrl?: string;
}

export type TypeAuth = {
  /**
   * Record of user IDs to account information
   */
  sessions: Record<string, Account>;
};

export class Auth extends AbstractStore<"auth", TypeAuth> {
  constructor(state: State) {
    super(state, "auth");
  }

  hydrate(): void {
    if (import.meta.env.VITE_TOKEN && import.meta.env.VITE_USER_ID) {
      this.setSession(
        {
          token: import.meta.env.VITE_TOKEN!,
          user_id: import.meta.env.VITE_USER_ID!,
        },
        import.meta.env.VITE_API_URL!
      );
    }

    // have to pull it out of the window because otherwise
    // we get some weird import errors :(
    // TODO: could make this into a utility function instead and
    // pull everything from a single place such as "@revolt/common"
    const clientController = (window as any).controllers
      .client as ClientController;

    for (const entry of this.getAccounts()) {
      clientController.addSession(entry, "existing");
    }

    clientController.pickNextSession();
  }

  default(): TypeAuth {
    return {
      sessions: {},
    };
  }

  clean(input: Partial<TypeAuth>) {
    const sessions: TypeAuth["sessions"] = {};
    const originalSessions = (input.sessions ?? {}) as TypeAuth["sessions"];

    for (const user_id of Object.keys(originalSessions)) {
      const entry = originalSessions[user_id];

      if (
        typeof entry.session.token === "string" &&
        ["string", "undefined"].includes(typeof entry.apiUrl)
      ) {
        sessions[user_id] = {
          session: {
            user_id,
            token: entry.session.token,
          },
          apiUrl: entry.apiUrl,
        };
      }
    }

    return {
      sessions,
    };
  }

  /**
   * Get all known accounts.
   * @returns Array of accounts
   */
  getAccounts() {
    const sessions = this.get().sessions;
    return Object.keys(sessions).map((key) => sessions[key]);
  }

  /**
   * Add a new session to the auth manager.
   * @param session Session
   * @param apiUrl Custom API URL
   */
  setSession(session: Session, apiUrl?: string) {
    this.set("sessions", session.user_id, { session, apiUrl });
  }

  /**
   * Remove existing session by user ID.
   * @param user_id User ID tied to session
   */
  removeSession(user_id: string) {
    const { [user_id]: _, ...sessions } = this.get().sessions;
    this.set("sessions", sessions);
  }
}
