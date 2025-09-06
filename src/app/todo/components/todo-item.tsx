import type { Todo } from "../todo";

type TodoItemProps = {
  todo: Todo;
};

export const TodoItem = ({ todo }: TodoItemProps) => {
  return (
    <div className="hover:bg-gray-100 py-1">
      #{todo.id} - {todo.text}
    </div>
  );
};
