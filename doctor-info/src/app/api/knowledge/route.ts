import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

// 지식 문서 목록 조회
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const { data: documents, error } = await supabase
    .from('knowledge_documents')
    .select(`
      *,
      knowledge_chunks(count)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (documents || []).map((doc: Record<string, unknown>) => ({
    ...doc,
    chunk_count: (doc.knowledge_chunks as { count: number }[])?.[0]?.count || 0,
  }));

  return NextResponse.json({ documents: result });
}

// 지식 문서 삭제
export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  // 관리자 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '관리자만 삭제할 수 있습니다.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('id');

  if (!documentId) {
    return NextResponse.json({ error: '문서 ID가 필요합니다.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('knowledge_documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
