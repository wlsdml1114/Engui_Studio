import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MigrationStatus {
  isRequired: boolean;
  currentVersion?: string;
  targetVersion?: string;
  backupCreated?: boolean;
  backupPath?: string;
}

export class MigrationService {
  /**
   * 데이터베이스 마이그레이션이 필요한지 확인
   */
  static async checkMigrationStatus(): Promise<MigrationStatus> {
    try {
      // 데이터베이스 연결 테스트
      await prisma.$connect();
      
      // 기존 테이블 구조 확인
      const tables = await prisma.$queryRaw`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ` as Array<{ name: string }>;
      
      const tableNames = tables.map(t => t.name);
      
      // 현재 스키마에 정의된 테이블들
      const expectedTables = ['jobs', 'presets', 'credit_activities', 'user_settings', 'api_logs', 'usage_stats', 'workspaces'];
      
      // 누락된 테이블이 있는지 확인
      const missingTables = expectedTables.filter(table => !tableNames.includes(table));
      
      return {
        isRequired: missingTables.length > 0,
        currentVersion: tableNames.join(','),
        targetVersion: expectedTables.join(',')
      };
    } catch (error) {
      console.error('Migration status check failed:', error);
      return {
        isRequired: true,
        currentVersion: 'unknown',
        targetVersion: 'unknown'
      };
    }
  }

  /**
   * 데이터베이스 백업 생성
   */
  static async createBackup(): Promise<string> {
    const fs = require('fs');
    const path = require('path');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(process.cwd(), 'prisma', 'db', `database_backup_${timestamp}.db`);
    const originalPath = path.join(process.cwd(), 'prisma', 'db', 'database.db');
    
    try {
      // 원본 파일이 존재하는지 확인
      if (fs.existsSync(originalPath)) {
        fs.copyFileSync(originalPath, backupPath);
        console.log(`Database backup created: ${backupPath}`);
        return backupPath;
      } else {
        throw new Error('Original database file not found');
      }
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw error;
    }
  }

  /**
   * 백업에서 데이터베이스 복원
   */
  static async restoreFromBackup(backupPath: string): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    
    const originalPath = path.join(process.cwd(), 'prisma', 'db', 'database.db');
    
    try {
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, originalPath);
        console.log(`Database restored from backup: ${backupPath}`);
      } else {
        throw new Error('Backup file not found');
      }
    } catch (error) {
      console.error('Backup restoration failed:', error);
      throw error;
    }
  }

  /**
   * 마이그레이션 실행
   */
  static async runMigration(): Promise<boolean> {
    const { execSync } = require('child_process');
    
    try {
      console.log('Running database migration...');
      execSync('npx prisma db push', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('Migration completed successfully');
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  }

  /**
   * 데이터 무결성 검사
   */
  static async validateDataIntegrity(): Promise<boolean> {
    try {
      // 각 테이블의 레코드 수 확인
      const jobCount = await prisma.job.count();
      const presetCount = await prisma.preset.count();
      const creditCount = await prisma.creditActivity.count();
      const settingCount = await prisma.userSetting.count();
      const logCount = await prisma.apiLog.count();
      const statsCount = await prisma.usageStats.count();
      const workspaceCount = await prisma.workspace.count();

      console.log('Data integrity check:');
      console.log(`- Jobs: ${jobCount}`);
      console.log(`- Presets: ${presetCount}`);
      console.log(`- Credit Activities: ${creditCount}`);
      console.log(`- User Settings: ${settingCount}`);
      console.log(`- API Logs: ${logCount}`);
      console.log(`- Usage Stats: ${statsCount}`);
      console.log(`- Workspaces: ${workspaceCount}`);

      return true;
    } catch (error) {
      console.error('Data integrity validation failed:', error);
      return false;
    }
  }

  /**
   * 마이그레이션 완료 후 정리 작업
   */
  static async cleanup(): Promise<void> {
    try {
      // 오래된 백업 파일 정리 (30일 이상 된 파일)
      const fs = require('fs');
      const path = require('path');
      
      const backupDir = path.join(process.cwd(), 'prisma', 'db');
      const files = fs.readdirSync(backupDir);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      files.forEach((file: string) => {
        if (file.startsWith('database_backup_') && file.endsWith('.db')) {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < thirtyDaysAgo) {
            fs.unlinkSync(filePath);
            console.log(`Cleaned up old backup: ${file}`);
          }
        }
      });
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}
