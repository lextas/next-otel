import Link from "next/link";
import { getTodos } from "./actions";
import { TodoItem } from "./components/todo-item";


export default async function Todo(){

  const todos = await getTodos();

  return (
    <div className="flex flex-col gap-2">
      { todos.map(todo => {
        return (
          <Link key={todo.id} href={`/todo/${todo.id}`}>
            <TodoItem key={todo.id} todo={todo} />
          </Link> 
        )
      })}
    </div>
  );
}