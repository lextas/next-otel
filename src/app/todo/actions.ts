import type { Todo } from "./todo";

function sleep(n: number = 300) {
  return new Promise((r) => setTimeout(r, n));
}

const todos: Todo[] = [
  {
    id: "1",
    text: "Deep dive into OpenTelemetry to figure out what it has to offer",
  },
  {
    id: "2",
    text: "Fix propagation of frontend traces to RSC requests",
  },
  {
    id: "3",
    text: "Add more demo code",
  },
];

export async function getTodos() {
  await sleep();

  return todos;
}

export async function getTodoById(id: string) {
  return todos.find((m) => m.id === id);
}

// export async function addTodo(text: string) {
//   await sleep();

//   const todo = {
//     id: (todos.length + 1).toString(),
//     text,
//   };

//   todos.push(todo);

//   return todo;
// }

// export async function editTodo(todo: Todo) {
//   await sleep();

//   const index = todos.findIndex((m) => m.id === todo.id);

//   if (!todos[index]) {
//     return {
//       success: false,
//       error: "Could not update Todo",
//     };
//   }

//   if (!todo.text) {
//     return {
//       success: false,
//       error: "Property `Text` is required",
//     };
//   }

//   todos[index] = todo;

//   return {
//     success: true,
//   };
// }

// export async function deleteTodo(id: string) {
//   await sleep();

//   const index = todos.findIndex((m) => m.id === id);

//   if (!index) {
//     throw new Error("Invalid Todo");
//   }

//   todos.splice(index, 1);
// }
