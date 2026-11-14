import bcrypt from "bcryptjs";
import { createInterface } from "node:readline";
import { prisma } from "../src/lib/prisma";

const email = process.env.ALLOWED_EMAIL?.toLowerCase();

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = (rl as unknown as { _writeToOutput: (s: string) => void });
    process.stdout.write(question);
    write._writeToOutput = () => {};
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  if (!email) throw new Error("ALLOWED_EMAIL is not set");

  const password = await promptHidden("New password (min 10 chars, typing is hidden): ");
  if (password.length < 10) throw new Error("Password must be at least 10 characters");
  const confirm = await promptHidden("Type it again: ");
  if (confirm !== password) throw new Error("Passwords did not match, nothing changed");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { email }, data: { passwordHash } });
  console.log("Password updated for", email);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
