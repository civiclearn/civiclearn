/**
 * CIVIC LEARN - UNIVERSAL RESULTS ENGINE
 */
(async () => {
    const mount = document.getElementById("cipleResults");
    const urlParams = new URLSearchParams(location.search);
    const EXAM_ID = urlParams.get("exam") || "ciple-01";

    // 1. Wait for Supabase
    const supabase = await new Promise(resolve => {
        if (window.supabase) return resolve(window.supabase);
        const iv = setInterval(() => {
            if (window.supabase) { clearInterval(iv); resolve(window.supabase); }
        }, 50);
    });

    // 2. Auth & Fetch
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: results, error } = await supabase
        .from("exam_section_results")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("exam_id", EXAM_ID);

    if (error || !results) return;

    // 3. Render Sections
    const sections = [
        { id: "reading", label: "Compreensão de Leitura" },
        { id: "listening", label: "Compreensão Oral" },
        { id: "writing", label: "Expressão Escrita" },
        { id: "speaking", label: "Expressão Oral" }
    ];

    mount.innerHTML = sections.map(s => {
        const data = results.find(r => r.section === s.id);
        const score = data?.result_json?.score?.percent || data?.result_json?.final_score || 0;
        const statusClass = data ? (score >= 55 ? "pass" : "fail") : "pending";

        return `
            <li class="section-result-item">
                <div class="section-info">
                    <span class="section-name">${s.label}</span>
                    <span class="section-status ${statusClass}">
                        ${data ? score + "%" : "Não realizado"}
                    </span>
                </div>
                ${data ? `<div class="progress-bar"><div class="fill" style="width: ${score}%"></div></div>` : ''}
            </li>
        `;
    }).join('');

    // 4. Update Header Average
    const validScores = results.map(r => r.result_json?.score?.percent || r.result_json?.final_score || 0);
    if (validScores.length > 0) {
        const avg = Math.round(validScores.reduce((a, b) => a + b, 0) / 4);
        const sub = document.getElementById("examSubtitle");
        if (sub) sub.innerHTML = `Média Global: <strong>${avg}%</strong>`;
    }
})();