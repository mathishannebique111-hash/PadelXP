import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const messageSchema = z.object({
  sender_type: z.enum(['club', 'player']),
  sender_id: z.string().uuid(),
  sender_name: z.string(),
  subject: z.string().optional(),
  message: z.string().min(1),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = messageSchema.parse(body);

    // Verify sender_id matches authenticated user
    if (validatedData.sender_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Insert message
    const { data: message, error } = await supabaseAdmin
      .from('admin_messages')
      .insert({
        sender_type: validatedData.sender_type,
        sender_id: validatedData.sender_id,
        sender_name: validatedData.sender_name,
        subject: validatedData.subject || null,
        message: validatedData.message,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating message:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('Unexpected error in messages API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
