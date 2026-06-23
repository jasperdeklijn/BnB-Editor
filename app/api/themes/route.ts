import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ThemeConfig } from '@/lib/themes';

export async function POST(request: NextRequest) {
  try {
    const { websiteId, themeConfig } = (await request.json()) as {
      websiteId: string;
      themeConfig: ThemeConfig;
    };

    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    if (!themeConfig || !themeConfig.paletteId || !themeConfig.fontPairId) {
      return NextResponse.json({ error: 'Invalid theme configuration' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify website ownership
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, user_id')
      .eq('id', websiteId)
      .single();

    if (websiteError || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    if (website.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to modify this website' }, { status: 403 });
    }

    // Update website with theme configuration
    // Store theme config in a dedicated column or in the existing settings JSONB
    const { error: updateError } = await supabase
      .from('websites')
      .update({
        theme_config: themeConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', websiteId);

    if (updateError) {
      console.error('Error updating theme:', updateError);
      return NextResponse.json({ error: 'Failed to save theme configuration' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Theme configuration saved successfully',
      themeConfig,
    });
  } catch (error) {
    console.error('Theme API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const websiteId = request.nextUrl.searchParams.get('websiteId');

    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get website theme config
    const { data: website, error } = await supabase
      .from('websites')
      .select('theme_config')
      .eq('id', websiteId)
      .single();

    if (error || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    return NextResponse.json({
      themeConfig: website.theme_config || null,
    });
  } catch (error) {
    console.error('Theme GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
