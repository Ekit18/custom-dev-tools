export {};

// Environment variables for test runs
process.env.JWT_SECRET = "test-jwt-secret-at-least-32-characters-long";
process.env.DATABASE_URL = "file:./test.sqlite";
process.env.MONGO_DATABASE_URL =
  "mongodb://127.0.0.1:27017/test?directConnection=true";

type MatchMediaListener = (event: MediaQueryListEvent) => void;

type MatchMediaMock = {
  media: string;
  matches: boolean;
  onchange: ((event: MediaQueryListEvent) => void) | null;
  addEventListener: (type: string, listener: MatchMediaListener) => void;
  removeEventListener: (type: string, listener: MatchMediaListener) => void;
  addListener: (listener: MatchMediaListener) => void;
  removeListener: (listener: MatchMediaListener) => void;
  dispatchEvent: (event: MediaQueryListEvent) => boolean;
  setMatches: (value: boolean) => void;
};

if (typeof window !== "undefined") {
  const createMatchMediaMock = (query: string): MatchMediaMock => {
    const listeners = new Set<MatchMediaListener>();

    const mock: MatchMediaMock = {
      media: query,
      matches: false,
      onchange: null,
      addEventListener: (_type: string, listener: MatchMediaListener) =>
        listeners.add(listener),
      removeEventListener: (_type: string, listener: MatchMediaListener) =>
        listeners.delete(listener),
      addListener: (listener: MatchMediaListener) => listeners.add(listener),
      removeListener: (listener: MatchMediaListener) =>
        listeners.delete(listener),
      dispatchEvent: (event: MediaQueryListEvent) => {
        listeners.forEach((listener) => {
          listener(event);
        });
        if (typeof mock.onchange === "function") {
          mock.onchange(event);
        }
        return true;
      },
      setMatches: (value: boolean) => {
        mock.matches = value;
        mock.dispatchEvent({
          matches: value,
          media: query,
        } as MediaQueryListEvent);
      },
    };

    return mock;
  };

  const matchMediaState: Record<string, MatchMediaMock> = {
    "(prefers-color-scheme: dark)": createMatchMediaMock(
      "(prefers-color-scheme: dark)",
    ),
  };

  (
    globalThis as unknown as {
      __matchMediaState: Record<string, MatchMediaMock>;
    }
  ).__matchMediaState = matchMediaState;

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => {
      if (!matchMediaState[query]) {
        matchMediaState[query] = createMatchMediaMock(query);
      }
      return matchMediaState[query] as MediaQueryList;
    },
  });

  beforeEach(() => {
    window.localStorage.clear();
    matchMediaState["(prefers-color-scheme: dark)"].setMatches(false);
  });
}
