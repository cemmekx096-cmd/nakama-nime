package com.nakama.player.data.model

import androidx.room.Entity
import androidx.room.Index

/**
 * Model extension yang terinstall.
 * Metadata extension disimpan di file JSON (ExtensionBridge),
 * tabel ini untuk query cepat dari JS.
 */
@Entity(
    tableName = "extension",
    primaryKeys = ["pkg"],
    indices = [
        Index(value = ["trusted"]),
        Index(value = ["installedAt"])
    ]
)
data class ExtensionModel(
    val pkg:         String,
    val name:        String,
    val version:     String,
    val lang:        String  = "id",
    val iconUrl:     String  = "",
    val fileUrl:     String  = "",
    val repoUrl:     String  = "",
    val trusted:     Boolean = false,
    val nsfw:        Boolean = false,
    val installedAt: Long    = System.currentTimeMillis(),
    val updatedAt:   Long    = System.currentTimeMillis()
)
