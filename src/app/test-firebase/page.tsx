'use client'

import { useEffect, useState } from 'react'
import { collection, addDoc, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

export default function TestFirebase() {
  const [status, setStatus] = useState('Testando...')
  const [error, setError] = useState('')

  useEffect(() => {
    const testFirestore = async () => {
      try {
        // Teste 1: Tentar escrever um documento
        setStatus('Tentando escrever no Firestore...')
        const testCollection = collection(db, 'test')
        const docRef = await addDoc(testCollection, {
          message: 'Teste de conexão',
          timestamp: new Date(),
          test: true
        })

        setStatus(`✅ Escrita funcionou! Doc ID: ${docRef.id}`)

        // Teste 2: Tentar ler documentos
        setTimeout(async () => {
          try {
            setStatus('Tentando ler do Firestore...')
            const querySnapshot = await getDocs(testCollection)
            const docs = querySnapshot.docs.length
            setStatus(`✅ Leitura funcionou! ${docs} documentos encontrados`)
          } catch (readError: unknown) {
            const message = readError instanceof Error ? readError.message : String(readError)
            setError(`❌ Erro na leitura: ${message}`)
          }
        }, 1000)

      } catch (writeError: unknown) {
        const message = writeError instanceof Error ? writeError.message : String(writeError)
        setError(`❌ Erro na escrita: ${message}`)
        setStatus('Falha na conexão')
      }
    }

    testFirestore()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">🧪 Teste Firebase</h1>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h2 className="font-semibold text-blue-800 mb-2">Status:</h2>
            <p className="text-blue-700">{status}</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 rounded-lg">
              <h2 className="font-semibold text-red-800 mb-2">Erro:</h2>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="p-4 bg-yellow-50 rounded-lg">
            <h2 className="font-semibold text-yellow-800 mb-2">Se der erro:</h2>
            <p className="text-yellow-700 text-sm">
              Acesse o Firebase Console e altere as regras do Firestore para:
            </p>
            <code className="block mt-2 p-2 bg-yellow-100 rounded text-xs">
              allow read, write: if true;
            </code>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="block w-full bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700"
          >
            ← Voltar ao App
          </Link>
        </div>
      </div>
    </div>
  )
}