import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { keycloakId, email, name, username } = await request.json()

    if (!keycloakId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Keycloak IDでユーザーを検索
    const { data: existingUser, error: searchError } = await supabase
      .from('users')
      .select('*')
      .eq('keycloak_id', keycloakId)
      .single()

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('Error searching user:', searchError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (existingUser) {
      // 既存ユーザーの情報を更新
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          email,
          name: name || username,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating user:', updateError)
        return NextResponse.json(
          { error: 'Failed to update user' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        user: updatedUser,
        isNewUser: false 
      })
    } else {
      // 新規ユーザーを作成
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          keycloak_id: keycloakId,
          email,
          name: name || username,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (createError) {
        console.error('Error creating user:', createError)
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        user: newUser,
        isNewUser: true 
      })
    }
  } catch (error) {
    console.error('Sync user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
