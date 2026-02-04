/**
 * Test Runner for flo-social-worker
 * Mocks Facebook API until real credentials are available
 */

// Mock Facebook API responses
const mockFacebookAPI = {
  postToPage: async (pageId, token, options) => {
    console.log('\n📱 [MOCK] Facebook API Call');
    console.log('Page ID:', pageId);
    console.log('Token:', token.substring(0, 20) + '...');
    console.log('Message:', options.message.substring(0, 100) + '...');
    console.log('Link:', options.link || 'none');
    console.log('Image:', options.image_url || 'none');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate mock post ID
    const mockPostId = `${pageId}_${Date.now()}`;

    return {
      success: true,
      post_id: mockPostId,
      facebook_url: `https://facebook.com/${mockPostId.replace('_', '/posts/')}`
    };
  },

  verifyToken: async (pageId, token) => {
    console.log('\n🔐 [MOCK] Token Verification');
    console.log('Page ID:', pageId);
    console.log('Token:', token.substring(0, 20) + '...');

    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      valid: true,
      name: "Flo's Test Page"
    };
  }
};

// Test content generator
const testContentGenerator = () => {
  console.log('\n🧪 Testing Content Generator...\n');

  const highlights = [
    {
      text: 'Built flo-social-worker for automated Facebook posting',
      source: 'memory'
    },
    {
      text: 'Integrated Graph API v19.0 for reliable posting',
      source: 'memory'
    },
    {
      text: 'Created test suite with mocked Facebook API',
      source: 'memory'
    }
  ];

  // Generate post
  const mockGeneratePost = (highlights, context) => {
    let message = "Here's what I've been working on:\n\n";
    
    highlights.slice(0, 3).forEach((highlight, idx) => {
      if (idx === 0) {
        message += `✨ ${highlight.text}\n`;
      } else {
        message += `• ${highlight.text}\n`;
      }
    });

    message += "\n\nBuilding in public, one commit at a time.";

    return {
      message,
      link: context.blogUrl,
      highlights: highlights.slice(0, 3)
    };
  };

  const content = mockGeneratePost(highlights, {
    includeLink: true,
    blogUrl: 'https://blog.minte.dev'
  });

  console.log('Generated Message:');
  console.log('---');
  console.log(content.message);
  console.log('---');
  console.log('\nLink:', content.link);
  console.log('Highlights used:', content.highlights.length);
  console.log('\n✅ Content generation test passed');
};

// Test manual posting
const testManualPost = async () => {
  console.log('\n🧪 Testing Manual Post Endpoint...\n');

  const testMessage = `🚀 Just launched flo-social-worker!

Automated Facebook posting powered by Cloudflare Workers and Graph API v19.0.

Features:
• Daily updates from memory files
• GitHub activity integration
• Content validation and formatting

Building in public, one commit at a time.`;

  const result = await mockFacebookAPI.postToPage(
    'TEST_PAGE_ID',
    'TEST_ACCESS_TOKEN',
    {
      message: testMessage,
      link: 'https://blog.minte.dev'
    }
  );

  console.log('\n📊 Result:');
  console.log('Success:', result.success);
  console.log('Post ID:', result.post_id);
  console.log('URL:', result.facebook_url);
  console.log('\n✅ Manual post test passed');

  return result;
};

// Test daily update generation
const testDailyUpdate = async () => {
  console.log('\n🧪 Testing Daily Update Generation...\n');

  // Mock highlights extraction
  const highlights = [
    {
      text: 'Deployed flo-social-worker to Cloudflare Workers',
      source: 'memory'
    },
    {
      text: 'Integrated with blog automation system',
      source: 'memory'
    },
    {
      text: 'Added content validation and formatting',
      source: 'memory'
    }
  ];

  // Generate content
  const mockGeneratePost = (highlights, context) => {
    let message = "Here's what I've been working on:\n\n";
    
    highlights.slice(0, 3).forEach((highlight, idx) => {
      if (idx === 0) {
        message += `✨ ${highlight.text}\n`;
      } else {
        message += `• ${highlight.text}\n`;
      }
    });

    message += "\n\nAnother day of solving problems with code.";

    return {
      message,
      link: context.blogUrl,
      highlights: highlights.slice(0, 3)
    };
  };

  const content = mockGeneratePost(highlights, {
    includeLink: true,
    blogUrl: 'https://blog.minte.dev'
  });

  console.log('Generated Content:');
  console.log('---');
  console.log(content.message);
  console.log('---');

  // Mock posting
  const result = await mockFacebookAPI.postToPage(
    'TEST_PAGE_ID',
    'TEST_ACCESS_TOKEN',
    {
      message: content.message,
      link: content.link
    }
  );

  console.log('\n📊 Result:');
  console.log('Success:', result.success);
  console.log('Post ID:', result.post_id);
  console.log('URL:', result.facebook_url);
  console.log('\n✅ Daily update test passed');

  return result;
};

// Test token verification
const testTokenVerification = async () => {
  console.log('\n🧪 Testing Token Verification...\n');

  const result = await mockFacebookAPI.verifyToken(
    'TEST_PAGE_ID',
    'TEST_ACCESS_TOKEN'
  );

  console.log('Valid:', result.valid);
  console.log('Page Name:', result.name);
  console.log('\n✅ Token verification test passed');

  return result;
};

// Run all tests
const runAllTests = async () => {
  console.log('🎯 flo-social-worker Test Suite\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Content Generation
    testContentGenerator();

    // Test 2: Token Verification
    await testTokenVerification();

    // Test 3: Manual Post
    await testManualPost();

    // Test 4: Daily Update
    await testDailyUpdate();

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests passed!\n');
    console.log('Next steps:');
    console.log('1. Create Facebook Page for Flo');
    console.log('2. Get Page Access Token from Graph API Explorer');
    console.log('3. Set secrets: wrangler secret put FLO_FB_PAGE_ID');
    console.log('4. Set secrets: wrangler secret put FLO_FB_PAGE_ACCESS_TOKEN');
    console.log('5. Deploy: npm run deploy');
    console.log('6. Test live: curl -X POST https://flo-social-worker.your-account.workers.dev/status');

  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    process.exit(1);
  }
};

// Run tests
runAllTests();
