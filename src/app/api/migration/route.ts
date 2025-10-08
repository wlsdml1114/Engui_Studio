import { NextRequest, NextResponse } from 'next/server';
import { MigrationService } from '@/lib/migrationService';

export async function GET(request: NextRequest) {
  try {
    const status = await MigrationService.checkMigrationStatus();
    
    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Migration status check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check migration status'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    switch (action) {
      case 'run-migration':
        // 백업 생성
        const backupPath = await MigrationService.createBackup();
        
        // 마이그레이션 실행
        const success = await MigrationService.runMigration();
        
        if (success) {
          // 데이터 무결성 검사
          const isValid = await MigrationService.validateDataIntegrity();
          
          return NextResponse.json({
            success: true,
            message: 'Migration completed successfully',
            data: {
              backupPath,
              dataIntegrityValid: isValid
            }
          });
        } else {
          // 마이그레이션 실패 시 백업에서 복원
          await MigrationService.restoreFromBackup(backupPath);
          
          return NextResponse.json({
            success: false,
            error: 'Migration failed, database restored from backup',
            data: { backupPath }
          }, { status: 500 });
        }
        
      case 'validate-data':
        const isValid = await MigrationService.validateDataIntegrity();
        
        return NextResponse.json({
          success: true,
          data: { isValid }
        });
        
      case 'cleanup':
        await MigrationService.cleanup();
        
        return NextResponse.json({
          success: true,
          message: 'Cleanup completed'
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Migration action failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Migration action failed'
    }, { status: 500 });
  }
}
