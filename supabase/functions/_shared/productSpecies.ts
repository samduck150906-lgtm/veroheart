/** A warning signal only: product names never establish species by themselves. */
export function productSpeciesConflict(name: string, target: unknown): boolean {
  const cat = /고양이|키튼|캣|\bcat\b|\bkitten\b|\bfeline\b/i.test(name);
  const dog = /강아지|퍼피|도그|\bdog\b|\bpuppy\b|\bcanine\b/i.test(name);
  return (target === 'dog' && cat && !dog) || (target === 'cat' && dog && !cat);
}
