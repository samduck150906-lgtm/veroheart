import os
import sys
import logging
import time
from typing import List, Dict, Any

# 로거 설정
logger = logging.getLogger("db_migration")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] (Migration) %(message)s"))
logger.addHandler(handler)

# PostgreSQL 연동 라이브러리 예외 방지 (모의/실제 호환 아키텍처)
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None
    RealDictCursor = None


class Aafco2024OnlineMigration:
    """AAFCO 2024 라벨 규정 준수를 위한 무중단(Online) 데이터베이스 마이그레이션 배치 스크립트"""
    def __init__(self, dsn: str = None):
        self.dsn = dsn or os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/veroro")
        self.chunk_size = 100  # RDB 락 점유율 최소화를 위한 배치 트랜잭션 크기 제한 (무중단 마이그레이션 필수 조건)

    def execute_migration(self) -> int:
        """식이섬유(total_dietary_fiber)가 유실된 사료들을 타겟팅하여 DMB 기반 보정 및 마이그레이션 수행"""
        logger.info("🚀 AAFCO 2024 식이섬유 무중단 마이그레이션 프로세스를 가동합니다.")
        
        if not psycopg2:
            logger.warning("[psycopg2 누락] RDB 드라이버가 존재하지 않아 모의 마이그레이션 시뮬레이션으로 대체합니다.")
            return self._run_mock_migration()

        conn = None
        try:
            # 1. PostgreSQL DB 커넥션 수립
            conn = psycopg2.connect(self.dsn)
            conn.autocommit = False # 트랜잭션 수동 제어 개시
            
            # 2. 마이 마이그레이션 대상 데이터 레코드 개수 사전 스캔
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*) FROM nutritional_profiles WHERE total_dietary_fiber IS NULL;"
                )
                total_targets = cur.fetchone()[0]
                
            logger.info(f"🎯 총 {total_targets}건의 마이그레이션(식이섬유 비어있음) 타겟 레코드 검출 완료.")
            if total_targets == 0:
                logger.info("✅ 이미 모든 사료 영양 프로필에 식이섬유 데이터가 보정 완료되었습니다.")
                return 0

            # 3. 락(Lock) 방지를 위해 Chunk 단위(100개씩) 페이징 조회 및 루프 갱신
            offset = 0
            migrated_count = 0

            while offset < total_targets:
                # DMB 보정 및 업데이트를 위해 100건씩 SELECT
                select_query = """
                    SELECT id, crude_fiber, moisture, total_dietary_fiber 
                    FROM nutritional_profiles 
                    WHERE total_dietary_fiber IS NULL
                    ORDER BY id
                    LIMIT %s OFFSET %s;
                """
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(select_query, (self.chunk_size, offset))
                    batch_rows = cur.fetchall()

                if not batch_rows:
                    break

                logger.info(f"📦 [Batch] {offset + 1} ~ {offset + len(batch_rows)} 행 분석 처리 중...")
                
                # 배치 내 레코드별 보정 연산 진행
                update_payloads = []
                for row in batch_rows:
                    row_id = row['id']
                    crude_fiber = float(row['crude_fiber']) if row['crude_fiber'] else 0.0
                    moisture = float(row['moisture']) if row['moisture'] else 0.0

                    # AAFCO 2024 가이드: 총 식이섬유 값이 명시되지 않은 경우, DMB 조섬유 기준
                    # DMB 조섬유 비율에 통상적인 식이섬유 계수 1.5 ~ 1.8배 곱 연산을 통한 영학적 보완 추정치 보정
                    dry_matter = (100.0 - moisture) / 100.0 if moisture < 100.0 else 1.0
                    dmb_fiber = crude_fiber / dry_matter
                    
                    # 영양학적 보정 수식 (총 식이섬유 추정 = DMB 조섬유 * 1.6)
                    estimated_tdf = round(dmb_fiber * 1.6 * dry_matter, 2)
                    
                    update_payloads.append((estimated_tdf, row_id))

                # 4. 배치 단위 벌크 UPDATE 실행 (트랜잭션 분할 처리)
                update_query = """
                    UPDATE nutritional_profiles 
                    SET total_dietary_fiber = %s
                    WHERE id = %s;
                """
                
                try:
                    with conn.cursor() as cur:
                        cur.executemany(update_query, update_payloads)
                    
                    # 배치마다 즉시 COMMIT 하여 테이블 락(Table Lock)을 즉시 해제 (무중단 서비스 보장)
                    conn.commit()
                    migrated_count += len(batch_rows)
                    logger.info(f"   -> {len(batch_rows)}건 배치 커밋 완료. 누적 마이그레이션: {migrated_count}건")
                    
                    # 대규모 마이그레이션 시 CPU 및 RDB 커넥션 스로틀링 예방 지터 추가
                    time.sleep(0.1) 
                except Exception as batch_err:
                    conn.rollback()
                    logger.error(f"❌ 배치 트랜잭션 에러 발생 및 롤백 조치: {batch_err}")
                    raise batch_err

                offset += self.chunk_size

            logger.info(f"🎉 무중단 데이터 마이그레이션 완료: 총 {migrated_count}개 영양 프로필 식이섬유 보정 성공!")
            return migrated_count

        except Exception as e:
            logger.error(f"🚨 [마이그레이션 대형 장애] 프로세스 중단: {e}")
            if conn:
                conn.close()
            return -1
        finally:
            if conn:
                conn.close()

    def _run_mock_migration(self) -> int:
        """RDB 드라이버가 없을 때 작동하는 시뮬레이션 마이그레이션 모듈"""
        mock_db = [
            {"id": "row_1", "crude_fiber": 3.0, "moisture": 10.0, "total_dietary_fiber": None},
            {"id": "row_2", "crude_fiber": 2.5, "moisture": 8.0, "total_dietary_fiber": None},
            {"id": "row_3", "crude_fiber": 4.5, "moisture": 75.0, "total_dietary_fiber": None} # 습식 사료 예시
        ]

        logger.info(f"🎯 [Mock] 시뮬레이션 대상 행: {len(mock_db)}건 검출")
        
        migrated = 0
        for row in mock_db:
            fiber = row["crude_fiber"]
            moisture = row["moisture"]
            
            # 보정 수식 가동
            dry_matter = (100.0 - moisture) / 100.0
            dmb_fiber = fiber / dry_matter
            estimated_tdf = round(dmb_fiber * 1.6 * dry_matter, 2)
            
            row["total_dietary_fiber"] = estimated_tdf
            migrated += 1
            
            logger.info(
                f"   [마이그레이션 완료] ID: {row['id']} | "
                f"기존 조섬유: {fiber}% (수분: {moisture}%) -> "
                f"AAFCO 2024 총 식이섬유 보정치: {estimated_tdf}%"
            )

        logger.info(f"🎉 [Mock] 데이터 마이그레이션 시뮬레이션 완료: 총 {migrated}건 성공")
        return migrated


# 로컬 가동 테스트
if __name__ == "__main__":
    migration = Aafco2024OnlineMigration()
    migration.execute_migration()
