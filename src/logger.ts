// logger.ts
import * as log from "std/log/mod.ts";

log.setup({
  handlers: {
    console: new log.ConsoleHandler("DEBUG", {
      formatter: log.formatters.jsonFormatter,
      useColors: false,
    }),
  },
  loggers: {
    default: {
      level: "DEBUG",
      handlers: ["console"],
    },
  },
});

export const logger = log.getLogger();
