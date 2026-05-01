package com.nakama.player.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.nakama.player.data.model.ExtensionModel

@Dao
interface ExtensionDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(ext: ExtensionModel)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(list: List<ExtensionModel>)

    @Query("SELECT * FROM extension ORDER BY installedAt DESC")
    suspend fun getAll(): List<ExtensionModel>

    @Query("""
        SELECT * FROM extension 
        WHERE pkg = :pkg 
        LIMIT 1
    """)
    suspend fun get(pkg: String): ExtensionModel?

    @Query("""
        SELECT EXISTS(SELECT 1 FROM extension WHERE pkg = :pkg)
    """)
    suspend fun exists(pkg: String): Boolean

    @Query("DELETE FROM extension WHERE pkg = :pkg")
    suspend fun delete(pkg: String)

    @Query("""
        SELECT version FROM extension 
        WHERE pkg = :pkg 
        LIMIT 1
    """)
    suspend fun getVersion(pkg: String): String?

    @Query("""
        UPDATE extension 
        SET version = :version, updatedAt = :updatedAt 
        WHERE pkg = :pkg
    """)
    suspend fun updateVersion(pkg: String, version: String, updatedAt: Long)
}
