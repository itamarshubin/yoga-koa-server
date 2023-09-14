import { createPubSub, createSchema, createYoga } from "graphql-yoga";
import mount from "koa-mount";
import Koa from "koa";
import { createHandler } from "graphql-sse";
const pubSub = createPubSub();

const gqlSchema = createSchema<{ app: any }>({
  typeDefs: /* GraphQL */ `
    type Query {
      hello: String
      isKoa: Boolean
    }
    type Subscription {
      randomNumber: String!
    }
  `,
  resolvers: {
    Query: {
      hello: () => {
        const rply = `wassap: ${Math.random()}`;
        pubSub.publish("YO", rply);
        return rply;
      },
      isKoa: (_, __, context) => !!context.app,
    },
    Subscription: {
      randomNumber: {
        // subscribe to the randomNumber event
        subscribe: () => pubSub.subscribe("YO"),
        resolve: (payload) => payload,
      },
    },
  },
});

export function buildApp() {
  const app = new Koa();

  const yoga = createYoga({
    schema: gqlSchema,
    logging: false,
  });

  app.use(mount("/graphql/stream", createHandler({ schema: gqlSchema })));
  app.use(async (ctx) => {
    const response = await yoga.handleNodeRequest(ctx.req, ctx);

    // Set status code
    ctx.status = response.status;

    // Set headers
    for (const [key, value] of response.headers.entries()) {
      ctx.append(key, value);
    }

    ctx.body = response.body;
  });

  return app;
}
