{-# LANGUAGE RecordWildCards #-}
{-# LANGUAGE DeriveGeneric #-}
module Types where
import Universum
import Language.Javascript.JSaddle (FromJSVal(fromJSVal), (!), ToJSVal, create, (<#), JSString)
import Monadic (doFromJSVal)
import Data.Time.Calendar (Day)
import Language.Javascript.JSaddle.Classes (ToJSVal(toJSVal))
import Yleiset ()
import Data.Aeson (FromJSON)

newtype Revision = Revision {
    revisio :: Natural
} deriving (Show, Generic)

instance FromJSON Revision

data Revisions = Revisions {
    infra :: Text,
    etj2 :: Text
} deriving Show

instance FromJSVal Revisions where
    fromJSVal = doFromJSVal "Revisions" $ \x -> do
        i <- MaybeT $ fromJSVal =<< x ! ("infra" :: Text)
        e  <- MaybeT $ fromJSVal =<< x ! ("etj2" :: Text)
        pure $ Revisions i e

data Train = Train {
    departureDate :: Day,
    trainNumber :: Natural
} deriving Show

instance ToJSVal Train where
    toJSVal Train{..} = do
        o <- create
        o <# ("departureDate" :: JSString) $ toJSVal departureDate
        o <# ("trainNumber" :: JSString) $ toJSVal trainNumber
        toJSVal o

instance FromJSVal Train where
    fromJSVal = doFromJSVal "Train" $ \x ->
        Train <$> MaybeT (fromJSVal =<< x ! ("departureDate" :: JSString))
              <*> MaybeT (fromJSVal =<< x ! ("trainNumber" :: JSString))