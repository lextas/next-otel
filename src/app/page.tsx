import { getRandomNumber } from "@/actions";
import { RandomNumber } from "@/components/random-number";

export default async function Home() {

  const randomNumber = await getRandomNumber();

  return (
    <div>
      <h1>Home</h1>
      <RandomNumber initialValue={randomNumber} />
    </div>
  );
}
