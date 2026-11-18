import "./App.css";
import { Show, SignInButton, SignOutButton } from "@clerk/react";
function App() {
  return (
    <>
      <h1>Welcome</h1>

      <Show when="signed-out">
        <SignInButton mode="modal" />
      </Show>

      <Show when="signed-in">
        <SignOutButton />
      </Show>
    </>
  );
}

export default App;
