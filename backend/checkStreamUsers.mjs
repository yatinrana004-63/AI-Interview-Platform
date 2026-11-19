
import "dotenv/config";
import { StreamClient } from "@stream-io/node-sdk";

const client = new StreamClient(
  process.env.STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

try {
  const response = await client.queryUsers({
    payload: {
      filter_conditions: {},
      limit: 100,
    },
  });

  console.table(
    response.users.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
    }))
  );

  console.log("Users returned:", response.users.length);
} catch (error) {
  console.error(error);
}
