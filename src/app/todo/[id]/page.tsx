import Link from "next/link";
import { notFound } from "next/navigation";
import { getTodoById } from "../actions";

type TodoDetailsProps = {
  params: Promise<{ id: string }>
}

export default async function TodoDetails({ params }: TodoDetailsProps){

  const { id } = await params;

  const todo = await getTodoById(id);

  if(!todo){
    return notFound();
  }

  return (
    <div className="flex flex-col gap-y-2">
      <p>{todo.text}</p>

      <Link href="/todo" className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 w-fit">← Back</Link>
    </div>
  );
}