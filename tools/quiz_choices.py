"""Compile reviewed semantic groups; never fill with random unrelated terms."""
def compile_choices(words, config):
    names = {w['t'] for w in words}
    errors = []
    avoid = {w['t']: set(w.get('avoid_with', [])) for w in words}
    for a, b in config.get('excluded_pairs', []):
        if a not in names or b not in names or a == b:
            errors.append(f'4択: 不正な除外ペア {a} / {b}')
            continue
        avoid[a].add(b)
        avoid[b].add(a)
    groups = config.get('groups', [])
    for group in groups:
        terms = group['terms']
        if len(set(terms)) != len(terms) or any(t not in names for t in terms):
            errors.append(f"4択: 不明・重複用語 {group['label']}")
    held = config.get('typing_only', {})
    if any(t not in names or not reason for t, reason in held.items()):
        errors.append('4択: 保留用語・理由が不正です')
    if errors:
        return {}, errors
    def compatible_peers(peers):
        # Prefer a large compatible set so two overlapping distractors cannot reveal the answer.
        best = []
        for first in peers:
            selected = [first]
            for peer in peers:
                if peer not in selected and all(peer not in avoid[t] and t not in avoid[peer] for t in selected):
                    selected.append(peer)
            if len(selected) > len(best):
                best = selected
        return best
    output = {}
    for w in words:
        term = w['t']
        if term in held:
            continue
        candidates = []
        for group in groups:
            if term in group['terms']:
                peers = [t for t in group['terms'] if t != term and t not in avoid[term] and term not in avoid[t]]
                peers = compatible_peers(peers)
                if len(peers) >= 3:
                    candidates.append((len(group['terms']), peers))
        if candidates:
            # Choose the narrowest usable comparison class, preserving authored order for ties.
            output[term] = min(candidates, key=lambda x: x[0])[1]
        else:
            # Only combine overlapping authored groups, never category-wide fallback.
            peers = list(dict.fromkeys(t for group in groups if term in group['terms'] for t in group['terms'] if t != term and t not in avoid[term] and term not in avoid[t]))
            peers = compatible_peers(peers)
            if len(peers) < 3:
                errors.append(f'4択: {term} は誤答候補が3語未満です')
            else:
                output[term] = peers
    return output, errors
