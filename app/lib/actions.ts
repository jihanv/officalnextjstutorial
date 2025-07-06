"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from 'next/navigation';
import postgres from "postgres";

/**
 * Creates a PostgreSQL client using the connection URL from environment variables.
 * The `ssl: 'require'` option ensures the connection is encrypted.
 * This `sql` object is used to run queries against the database.
 */
const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

// You define a schema with zod:
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
  date: z.string(),
});

// Create a version of the schema for creating invoices:
const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  /**
   * .parse() takes an object (e.g., form values) and:
   *
   * 1. Checks that every required property is present.
   * 2. Checks that each value has the correct type (string, number, enum).
   * 3. Transforms values if necessary (e.g., z.coerce.number() will turn "500" into 500).
   * 4. Returns the validated + transformed object if all checks pass.
   * 5. Throws an error if validation fails.
   */
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  // Insert data into the database
  await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;

  /**
   * Revalidate the cache for the invoices page so users see the newly created invoice immediately.
   * This clears any stale cached HTML or data for the specified path.
   */
  revalidatePath("/dashboard/invoices");

    redirect('/dashboard/invoices');

}
