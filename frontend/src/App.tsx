import { Button } from "./components/ui/Button";

const App = () => {
  return (
    <div>
      <h1 className="text-2xl text-green-500"> Revisit</h1>
      <Button variant="ghost" size="md">
        {" "}
        Save
      </Button>
      <Button variant="primary" size="lg">
        Cancel
      </Button>
    </div>
  );
};

export default App;
