package com.nakama.player.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.nakama.player.data.model.EpisodeModel

@Dao
interface EpisodeDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(episodes: List<EpisodeModel>)

    @Query("""
        SELECT * FROM episode 
        WHERE animeId = :animeId AND pkg = :pkg 
        ORDER BY number ASC
    """)
    suspend fun getByAnime(animeId: String, pkg: String): List<EpisodeModel>

    @Query("""
        DELETE FROM episode 
        WHERE animeId = :animeId AND pkg = :pkg
    """)
    suspend fun deleteByAnime(animeId: String, pkg: String)

    /**
     * Hapus episode cache yang sudah lebih dari 24 jam.
     * Dipanggil saat app buka untuk bersihkan cache lama.
     */
    @Query("""
        DELETE FROM episode 
        WHERE cachedAt < :cutoff
    """)
    suspend fun deleteOldCache(cutoff: Long)
}
