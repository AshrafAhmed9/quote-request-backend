import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { requestIdMiddleware } from "./middleware/requestId.middleware";
import { httpLogger } from "./middleware/logger.middleware";
import { errorMiddleware } from "./middleware/error.middleware";
import { notFoundMiddleware } from "./middleware/notFound.middleware";
import { openApiSpec } from "./docs/openapi";
import routes from "./routes/index";

const app = express();

app.use(helmet());
app.use(cors());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        type: "RATE_LIMITED",
        title: "Too Many Requests",
        status: 429,
        detail: "Rate limit exceeded. Try again later.",
      },
    },
  })
);
app.use(express.json());
app.use(requestIdMiddleware);
app.use(httpLogger);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.use("/api", routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
