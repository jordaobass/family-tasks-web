import { NextResponse } from 'next/server'
import { collection, addDoc, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Teste 1: Tentar escrever um documento
    console.log('🧪 Testando escrita no Firestore...')
    const testCollection = collection(db, 'test')
    const docRef = await addDoc(testCollection, {
      message: 'Teste de API - ' + new Date().toISOString(),
      timestamp: new Date(),
      test: true,
      success: true
    })

    console.log('✅ Escrita funcionou! Doc ID:', docRef.id)

    // Teste 2: Tentar ler documentos
    console.log('🧪 Testando leitura do Firestore...')
    const querySnapshot = await getDocs(testCollection)
    const docs = querySnapshot.docs.length

    console.log('✅ Leitura funcionou! Docs:', docs)

    return NextResponse.json({
      success: true,
      message: 'Firebase está funcionando!',
      results: {
        writeTest: { success: true, docId: docRef.id },
        readTest: { success: true, documentCount: docs }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: unknown) {
    console.error('❌ Erro no teste Firebase:', error)
    const message = error instanceof Error ? error.message : String(error)
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined

    return NextResponse.json({
      success: false,
      error: message,
      code,
      details: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}