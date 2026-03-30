import { readFileSync, writeFileSync } from 'fs';

const filePath = 'd:/Hi-AQLI/src/app/mufradat/page.tsx';
let content = readFileSync(filePath, 'utf8');

const target = `                 <div className="divide-y divide-slate-100">
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                             {u.reactionSummary.total > 0 && (
                               <div className="flex items-center -space-x-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 shadow-sm animate-in fade-in zoom-in">
                                 {u.reactionSummary.mabruk > 0 && <span title="Mabruk!" className="text-[10px]">🌟</span>}
                                 {u.reactionSummary.semangat > 0 && <span title="Semangat!" className="text-[10px]">💪</span>}
                                 {u.reactionSummary.hebat > 0 && <span title="Hebat!" className="text-[10px]">🙌</span>}
                                 <span className="text-[9px] font-black text-amber-700 ml-1.5">{u.reactionSummary.total}</span>
                               </div>
                             )}
                             {idx < 3 && <Star className={cn("w-5 h-5 fill-current transition-transform hover:scale-110", idx === 0 ? "text-amber-400" : idx === 1 ? "text-slate-300" : "text-amber-700/30")} />}
                          </div>
                          
                          {user?.id !== u.id && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => sendReaction(u.id, 'mabruk')}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-amber-100 flex items-center justify-center transition-colors text-amber-600"
                                title="Kirim Mabruk!"
                              >
                                <PartyPopper className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => sendReaction(u.id, 'semangat')}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-emerald-100 flex items-center justify-center transition-colors text-emerald-600"
                                title="Kirim Semangat!"
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => sendReaction(u.id, 'hebat')}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-100 flex items-center justify-center transition-colors text-rose-600"
                                title="Kirim Hebat!"
                              >
                                <Heart className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                 </div>`;

const replacement = `                  <div className="divide-y divide-slate-100">
                    {groupRankings.map((u, idx) => (
                      <div key={u.id} className="p-6 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center justify-center w-8">
                            <span className={cn(
                              "text-lg font-black font-headline",
                              idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-amber-700" : "text-slate-300"
                            )}>
                              {idx + 1}
                            </span>
                          </div>
                          
                          <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                            <AvatarImage src={u.avatar_url || ""} />
                            <AvatarFallback className="bg-[#800000] text-white font-bold text-lg">
                              {u.display_name?.[0] || 'D'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 flex items-center gap-2">
                              {u.display_name}
                              {user?.id === u.id && <span className="text-[10px] font-black bg-[#800000] text-white px-2 py-0.5 rounded-full">(SAYA)</span>}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">
                              <span className="text-[#800000]">{u.verseCount} Ayat</span>
                              <span>•</span>
                              <span>{u.points} Poin</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                             {u.reactionSummary?.total > 0 && (
                               <div className="flex items-center -space-x-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 shadow-sm animate-in fade-in zoom-in">
                                 {u.reactionSummary.mabruk > 0 && <span title="Mabruk!" className="text-[10px]">🌟</span>}
                                 {u.reactionSummary.semangat > 0 && <span title="Semangat!" className="text-[10px]">💪</span>}
                                 {u.reactionSummary.hebat > 0 && <span title="Hebat!" className="text-[10px]">🙌</span>}
                                 <span className="text-[9px] font-black text-amber-700 ml-1.5">{u.reactionSummary.total}</span>
                               </div>
                             )}
                             {idx < 3 && <Star className={cn("w-5 h-5 fill-current transition-transform hover:scale-110", idx === 0 ? "text-amber-400" : idx === 1 ? "text-slate-300" : "text-amber-700/30")} />}
                          </div>
                          
                          {user?.id !== u.id && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => sendReaction(u.id, 'mabruk')}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-amber-100 flex items-center justify-center transition-colors text-amber-600"
                                title="Kirim Mabruk!"
                              >
                                <PartyPopper className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => sendReaction(u.id, 'semangat')}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-emerald-100 flex items-center justify-center transition-colors text-emerald-600"
                                title="Kirim Semangat!"
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => sendReaction(u.id, 'hebat')}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-100 flex items-center justify-center transition-colors text-rose-600"
                                title="Kirim Hebat!"
                              >
                                <Heart className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>`;

if (content.includes(target.trim())) {
    content = content.replace(target.trim(), replacement.trim());
    writeFileSync(filePath, content);
    console.log('Successfully repaired mufradat/page.tsx');
} else {
    console.log('Target content not found. Checking for partial match...');
    // Fallback: search for just the broken segment
    const partialTarget = \`<div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                             {u.reactionSummary.total > 0 && (\`;
    if (content.includes(partialTarget.trim())) {
        console.log('Partial match found. Attempting surgery...');
        // More robust parsing needed, but let's try a simpler replacement since we know the context
    } else {
        console.log('Partial match also not found.');
    }
}
