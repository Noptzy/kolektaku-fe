export default function UserCard({ user }) {
    return (
        <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-white/10 bg-zinc-900/60 p-6 backdrop-blur-xl hover:border-violet-500/30 transition-colors">
            <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 overflow-hidden items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-lg font-bold uppercase text-white shadow-inner">
                    {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                        user.name?.[0] ?? user.email?.[0] ?? "U"
                    )}
                </div>
                <div className="text-left">
                    <p className="font-semibold text-white">{user.name ?? "—"}</p>
                    <p className="text-sm text-zinc-400">{user.email}</p>
                    <div className="mt-1 flex gap-2">
                        <span className="inline-block rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-300 border border-violet-500/20">
                            {user.provider ?? "Email"}
                        </span>
                        {user.roleId === 1 && (
                            <span className="inline-block rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-300 border border-red-500/20">
                                Admin
                            </span>
                        )}
                        {user.roleId === 2 && (
                            <span className="inline-block rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-300 border border-indigo-500/20">
                                Member
                            </span>
                        )}
                        {user.roleId === 3 && (
                            <span className="inline-block rounded-full bg-zinc-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-300 border border-zinc-500/20">
                                User Biasa
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
