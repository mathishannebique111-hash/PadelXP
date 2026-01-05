import { createClient as createAdminClient } from '@supabase/supabase-js';
import { MessageSquare, Building2, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

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

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage() {
  const { data: messages, error } = await supabaseAdmin
    .from('admin_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching messages:', error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600 mt-1">Messages reçus des clubs et joueurs</p>
      </div>

      {!messages || messages.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Aucun message</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => {
            const timeAgo = formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
              locale: fr,
            });

            return (
              <div
                key={message.id}
                className={`bg-white rounded-xl border ${
                  message.is_read ? 'border-gray-200' : 'border-blue-200 bg-blue-50/30'
                } p-6 hover:shadow-lg transition-all`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {message.sender_type === 'club' ? (
                        <Building2 className="w-5 h-5 text-blue-600" />
                      ) : (
                        <User className="w-5 h-5 text-green-600" />
                      )}
                      <span className="font-semibold text-gray-900">{message.sender_name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          message.sender_type === 'club'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {message.sender_type === 'club' ? 'Club' : 'Joueur'}
                      </span>
                      {!message.is_read && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-medium">
                          Non lu
                        </span>
                      )}
                    </div>
                    {message.subject && (
                      <h3 className="font-semibold text-gray-900 mb-2">{message.subject}</h3>
                    )}
                    <p className="text-gray-600 mb-3 line-clamp-2">{message.message}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{timeAgo}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
