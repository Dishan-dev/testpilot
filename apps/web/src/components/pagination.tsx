import Link from "next/link";

export function Pagination({ page, totalPages, totalElements, path }: { page: number; totalPages: number; totalElements: number; path: string }) {
  return <nav aria-label="Pagination" className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-400"><span>{totalElements} total · Page {page + 1} of {Math.max(1, totalPages)}</span><div className="flex gap-4">{page > 0 && <Link className="text-emerald-200" href={`${path}?page=${page - 1}`}>Previous</Link>}{page + 1 < totalPages && <Link className="text-emerald-200" href={`${path}?page=${page + 1}`}>Next</Link>}</div></nav>;
}
